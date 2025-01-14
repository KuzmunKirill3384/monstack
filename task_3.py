'''Задание 3. Рассмотреть следующие вероятностные стратегии игроков:  игрок A
равновероятно выбирает строку, а игрок B (случайно) выбирает красный столбец
втрое реже, чем синий. И провести полный цикл исследования, как это описано
в предыдущем задании.
'''

import random
import math

# Матрица выигрышей
matrix = [[10, -3],
          [-2, 8]]

def generate_choice(p):
    """Генерация случайного выбора с вероятностью p"""
    return 1 if random.random() < p else 0

def create_data(n):
    """Генерация данных для экспериментов"""
    data = []
    for _ in range(n):
        # Игрок A равновероятно выбирает строку (0 или 1)
        row_choice = generate_choice(0.5)
        # Игрок B выбирает красный столбец втрое реже (p=1/4 для красного, p=3/4 для синего)
        column_choice = generate_choice(0.25)
        data.append([row_choice, column_choice])
    return data

def calculate_theoretical_expectation(matrix):
    """Расчет теоретического математического ожидания"""
    # Вероятности выбора строк/столбцов
    probabilities = [[0.5 * 0.25, 0.5 * 0.75],  # Строка 0
                     [0.5 * 0.25, 0.5 * 0.75]]  # Строка 1
    expectation = 0
    for i in range(2):
        for j in range(2):
            expectation += probabilities[i][j] * matrix[i][j]
    return expectation

def calculate_theoretical_variance(matrix, expectation):
    """Расчет теоретической дисперсии"""
    probabilities = [[0.5 * 0.25, 0.5 * 0.75],  # Строка 0
                     [0.5 * 0.25, 0.5 * 0.75]]  # Строка 1
    variance = 0
    for i in range(2):
        for j in range(2):
            variance += probabilities[i][j] * (matrix[i][j] - expectation) ** 2
    return variance

def main():
    n_experiments = 100000
    data = create_data(n_experiments)

    # Вычисление выигрышей
    results_a = []  # Выигрыши игрока A
    results_b = []  # Проигрыши игрока B (симметрично выигрышам A)

    for s_ch, st_ch in data:
        result_a = matrix[s_ch][st_ch]  # Выигрыш игрока A из выбранной строки и столбца
        results_a.append(result_a)
        results_b.append(-result_a)  # Проигрыш игрока B равен -выигрышу игрока A

    # Среднее значение выигрыша/проигрыша
    mean_experimental_a = sum(results_a) / n_experiments
    mean_experimental_b = sum(results_b) / n_experiments

    # Теоретическое математическое ожидание
    theoretical_expectation = calculate_theoretical_expectation(matrix)

    # Среднее квадратичное отклонение
    experimental_std_dev_a = math.sqrt(sum((x - mean_experimental_a) ** 2 for x in results_a) / n_experiments)
    experimental_std_dev_b = math.sqrt(sum((x - mean_experimental_b) ** 2 for x in results_b) / n_experiments)

    # Дисперсия и теоретическое СКО
    theoretical_variance = calculate_theoretical_variance(matrix, theoretical_expectation)
    theoretical_std_dev = math.sqrt(theoretical_variance)

    # Вывод результатов
    print("Экспериментальные данные:")
    print(f"Средний выигрыш игрока A (эксперимент): {mean_experimental_a}")
    print(f"Среднее квадратичное отклонение игрока A (эксперимент): {experimental_std_dev_a}")
    print(f"Среднее квадратичное отклонение игрока B (эксперимент): {experimental_std_dev_b}")

    print("\nТеоретические данные:")
    print(f"Математическое ожидание выигрыша/проигрыша игрока A: {theoretical_expectation}")
    print(f"Дисперсия выигрыша/проигрыша: {theoretical_variance}")
    print(f"Среднее квадратичное отклонение: {theoretical_std_dev}")

if __name__ == '__main__':
    main()